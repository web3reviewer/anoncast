import { createTree } from '.'
import { ANON_ADDRESS } from '../lib/config'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL as string)

const main = async () => {
  const tree = await createTree({ tokenAddress: ANON_ADDRESS })
  console.log(tree.root)
  await redis.set(`anon:tree:${ANON_ADDRESS}`, JSON.stringify(tree), 'EX', 60 * 5)
}

main().then(() => {
  process.exit(0)
})
