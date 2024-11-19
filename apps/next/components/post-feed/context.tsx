import { PostCastResponse } from '@/lib/types'
import { generateProofForDelete } from '@anon/api/lib/proof'
import { createContext, useContext, useState, ReactNode } from 'react'
import { hashMessage } from 'viem'

type State =
  | {
      status: 'idle' | 'signature' | 'generating' | 'deleting'
    }
  | {
      status: 'success'
      post: PostCastResponse
    }
  | {
      status: 'error'
      error: string
    }

interface DeletePostContextProps {
  deletePost: (hash: string) => Promise<void>
  state: State
}

const DeletePostContext = createContext<DeletePostContextProps | undefined>(undefined)

export const DeletePostProvider = ({
  tokenAddress,
  userAddress,
  children,
  getSignature,
}: {
  tokenAddress: string
  userAddress?: string
  children: ReactNode
  getSignature: ({
    address,
    timestamp,
  }: { address: string; timestamp: number }) => Promise<
    | {
        signature: string
        message: string
      }
    | undefined
  >
}) => {
  const [state, setState] = useState<State>({ status: 'idle' })

  const deletePost = async (hash: string) => {
    if (!userAddress) return

    setState({ status: 'signature' })
    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const signatureData = await getSignature({
        address: userAddress,
        timestamp,
      })
      if (!signatureData) {
        setState({ status: 'error', error: 'Failed to get signature' })
        return
      }

      setState({ status: 'generating' })

      const proof = await generateProofForDelete({
        address: userAddress,
        hash,
        tokenAddress,
        timestamp,
        signature: signatureData.signature,
        messageHash: hashMessage(signatureData.message),
      })
      if (!proof) {
        setState({ status: 'error', error: 'Not allowed to delete' })
        return
      }

      setState({ status: 'deleting' })

      let response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/post/delete`, {
        method: 'POST',
        body: JSON.stringify({
          proof: Array.from(proof.proof),
          publicInputs: proof.publicInputs.map((i) => Array.from(i)),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Try aggain
      if (!response.ok) {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/post/delete`, {
          method: 'POST',
          body: JSON.stringify({
            proof: Array.from(proof.proof),
            publicInputs: proof.publicInputs.map((i) => Array.from(i)),
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }

      if (!response.ok) {
        setState({ status: 'error', error: 'Failed to delete' })
        return
      }

      // Try again if it failed
      let data: PostCastResponse | undefined = await response.json()
      if (!data?.success) {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/post/delete`, {
          method: 'POST',
          body: JSON.stringify({
            proof: Array.from(proof.proof),
            publicInputs: proof.publicInputs.map((i) => Array.from(i)),
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        })
        data = await response.json()
      }

      if (data?.success) {
        setState({ status: 'success', post: data })
      } else {
        setState({ status: 'error', error: 'Failed to delete' })
      }
    } catch (e) {
      setState({ status: 'error', error: 'Failed to delete' })
      console.error(e)
    }
  }

  return (
    <DeletePostContext.Provider
      value={{
        deletePost,
        state,
      }}
    >
      {children}
    </DeletePostContext.Provider>
  )
}

export const useDeletePost = () => {
  const context = useContext(DeletePostContext)
  if (context === undefined) {
    throw new Error('useDeletePost must be used within a DeletePostProvider')
  }
  return context
}
