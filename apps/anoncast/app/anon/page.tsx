'use client'

import { CreatePostProvider } from '@/components/create-post/context'
import { NavTabs } from '@/components/nav-tabs'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatUnits, parseAbiItem } from 'viem'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'

export default function Home() {
  return (
    <CreatePostProvider initialVariant="anon">
      <Inner />
    </CreatePostProvider>
  )
}

function Inner() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <NavTabs />
        <div className="flex flex-col gap-2 bg-zinc-900 border border-zinc-700 p-4 rounded-lg">
          <span className="font-semibold text-xl">$ANON</span>
          <div className="flex flex-row gap-2 justify-between ">
            <div className="flex flex-row gap-2 flex-wrap text-zinc-400">
              <a
                href="https://basescan.org/token/0x0db510e79909666d6dec7f5e49370838c16d950f"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm decoration-dotted underline font-medium inline"
              >
                Basescan
              </a>
              <a
                href="https://app.interface.social/token/8453/0x0db510e79909666d6dec7f5e49370838c16d950f"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm decoration-dotted underline font-medium inline"
              >
                Interface
              </a>
              <a
                href="https://dexscreener.com/base/0xc4ecaf115cbce3985748c58dccfc4722fef8247c"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm decoration-dotted underline font-medium inline"
              >
                DEX Screener
              </a>
              <a
                href="https://app.uniswap.org/swap?outputCurrency=0x0Db510e79909666d6dEc7f5e49370838c16D950f&chain=base"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm decoration-dotted underline font-medium inline"
              >
                Uniswap
              </a>
            </div>
          </div>
          <BuyBurn />
        </div>
      </div>
    </div>
  )
}

function BuyBurn() {
  const { writeContract, data: hash, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })
  const [timeSinceLastSwap, setTimeSinceLastSwap] = useState(-1)

  const CONTRACT_ADDRESS: `0x${string}` = '0xC70671a8546CF3263B57f817a1c74f697da820C8'

  const { data, refetch } = useReadContract({
    address: '0x4200000000000000000000000000000000000006',
    abi: [parseAbiItem('function balanceOf(address) external view returns (uint256)')],
    functionName: 'balanceOf',
    args: [CONTRACT_ADDRESS],
  })

  const {
    data: lastSwap,
    refetch: refetchLastSwap,
    isLoading: isLoadingLastSwap,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: [parseAbiItem('function getLastSwapTimestamp() external view returns (uint40)')],
    functionName: 'getLastSwapTimestamp',
  })

  const handleClick = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: [parseAbiItem('function swapAndBurn() external')],
      functionName: 'swapAndBurn',
    })
  }

  useEffect(() => {
    if (isConfirmed) {
      setTimeSinceLastSwap(-1)
      refetch()
      refetchLastSwap()
    }
  }, [isConfirmed, refetch, refetchLastSwap])

  useEffect(() => {
    const timer = setInterval(() => {
      if (lastSwap) {
        const newSeconds = Math.floor((Date.now() - Number(lastSwap) * 1000) / 1000)
        setTimeSinceLastSwap(newSeconds)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [lastSwap])

  function formatTimeAgo(seconds: number): string {
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div className="flex flex-col gap-2 mt-4">
      <span className="font-bold text-md">Swap and Burn</span>
      <p className="text-sm text-zinc-400">
        Swap and burn the rewards earned by @anonfun from clanker-deployed tokens.
        Callable by anyone, at most once per minute.
      </p>
      <div className="flex flex-row justify-between mt-2">
        <p className="text-sm ">
          Burnable:{' '}
          {data ? `${Number.parseFloat(formatUnits(data, 18)).toFixed(4)} ETH` : '0 ETH'}
        </p>
        <p className="text-sm text-zinc-400">
          {lastSwap && timeSinceLastSwap !== -1
            ? `Last swap: ${formatTimeAgo(timeSinceLastSwap)}`
            : ''}
        </p>
      </div>
      <Button
        onClick={handleClick}
        disabled={isConfirming || timeSinceLastSwap < 60 || timeSinceLastSwap === -1}
      >
        {isConfirming ? (
          <div className="flex flex-row items-center gap-2">
            <Loader2 className="animate-spin" />
            <p>Burning...</p>
          </div>
        ) : timeSinceLastSwap === -1 ? (
          <Loader2 className="animate-spin" />
        ) : timeSinceLastSwap < 60 ? (
          `Wait ${60 - timeSinceLastSwap} seconds`
        ) : isConfirmed ? (
          <div className="flex flex-row items-center gap-2">
            <Check />
            <p>Burned</p>
          </div>
        ) : (
          'Swap and Burn'
        )}
      </Button>
      {error && <p className="text-sm text-red-500">{error.message}</p>}
    </div>
  )
}
