export const ANON_ADDRESS = '0x0db510e79909666d6dec7f5e49370838c16d950f'
export const COMMENT_ADDRESS = '0x0000000000000000000000000000000000000000'

export const TOKEN_CONFIG: Record<
  string,
  {
    ticker: string
    minAmount: string
    deleteAmount: string
    farcasterUsername: string
    fid: number
  }
> = {
  [ANON_ADDRESS]: {
    ticker: 'ANON',
    minAmount: '30000000000000000000000',
    deleteAmount: '3000000000000000000000000',
    farcasterUsername: 'anoncast',
    fid: 880094,
  },
  [COMMENT_ADDRESS]: {
    ticker: 'COMMENT',
    minAmount: '1',
    deleteAmount: '1',
    farcasterUsername: 'comment',
    fid: 880094,
  },
}

export const USERNAME_TO_ADDRESS: Record<string, string> = Object.entries(
  TOKEN_CONFIG
).reduce(
  (acc, [address, { farcasterUsername }]) => {
    acc[farcasterUsername] = address
    return acc
  },
  {} as Record<string, string>
)
