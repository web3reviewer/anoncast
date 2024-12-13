'use client'

import { useToast } from '@/lib/hooks/use-toast'
import { Cast, Channel, ExecuteActionsStatus, useExecuteActions } from '@anonworld/react'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useState, ReactNode } from 'react'
import { hashMessage } from 'viem'
import { POST_ACTION_ID } from '@/lib/utils'
import sdk from '@farcaster/frame-sdk'

interface CreatePostContextProps {
  text: string | null
  setText: (text: string) => void
  image: string | null
  setImage: (image: string | null) => void
  embed: string | null
  setEmbed: (embed: string | null) => void
  quote: Cast | null
  setQuote: (quote: Cast | null) => void
  channel: Channel | null
  setChannel: (channel: Channel | null) => void
  parent: Cast | null
  setParent: (parent: Cast | null) => void
  createPost: () => Promise<void>
  embedCount: number
  status: ExecuteActionsStatus
  confetti: boolean
  setConfetti: (confetti: boolean) => void
  revealPhrase: string | null
  setRevealPhrase: (revealPhrase: string | null) => void
  variant: 'anoncast' | 'anonfun'
  setVariant: (variant: 'anoncast' | 'anonfun') => void
}

const CreatePostContext = createContext<CreatePostContextProps | undefined>(undefined)

export const CreatePostProvider = ({
  initialVariant,
  children,
}: {
  children: ReactNode
  initialVariant?: 'anoncast' | 'anonfun'
}) => {
  const [text, setText] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [embed, setEmbed] = useState<string | null>(null)
  const [quote, setQuote] = useState<Cast | null>(null)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [parent, setParent] = useState<Cast | null>(null)
  const [revealPhrase, setRevealPhrase] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const { toast } = useToast()
  const [variant, setVariant] = useState<'anoncast' | 'anonfun'>(
    initialVariant || 'anoncast'
  )
  const router = useRouter()
  const { executeActions: performAction, status } = useExecuteActions({
    onSuccess: (response) => {
      const hash = response.findLast((r) => r.hash)?.hash
      sdk.actions.openUrl(`https://warpcast.com/~/conversations/${hash}`)
      sdk.actions.close()
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to post',
        description: error,
      })
    },
  })

  const createPost = async () => {
    const data = {
      text: text ?? undefined,
      embeds: embed ? [embed] : undefined,
      images: image ? [image] : undefined,
      quote: quote?.hash,
      channel: channel?.id,
      parent: parent?.hash,
    }

    await performAction([
      {
        actionId: POST_ACTION_ID,
        data: {
          ...data,
          revealHash: revealPhrase
            ? hashMessage(JSON.stringify(data) + revealPhrase)
            : undefined,
        },
      },
    ])
  }

  const embedCount = [image, embed, quote].filter((e) => e !== null).length

  const handleSetVariant = (variant: 'anoncast' | 'anonfun') => {
    setVariant(variant)
    router.push(variant === 'anoncast' ? '/' : '/anonfun')
  }

  return (
    <CreatePostContext.Provider
      value={{
        text,
        setText,
        image,
        setImage,
        embed,
        setEmbed,
        quote,
        setQuote,
        channel,
        setChannel,
        parent,
        setParent,
        embedCount,
        createPost,
        status,
        confetti,
        setConfetti,
        revealPhrase,
        setRevealPhrase,
        variant,
        setVariant: handleSetVariant,
      }}
    >
      {children}
    </CreatePostContext.Provider>
  )
}

export const useCreatePost = () => {
  const context = useContext(CreatePostContext)
  if (context === undefined) {
    throw new Error('useCreatePost must be used within a CreatePostProvider')
  }
  return context
}
