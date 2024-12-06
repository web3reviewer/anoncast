import { getAction } from '@anonworld/db'
import { createElysia } from '../utils'
import { t } from 'elysia'
import { redis } from '../services/redis'
import { simplehash } from '../services/simplehash'
import { LeanIMT } from '@zk-kit/lean-imt'
import { pad, zeroAddress } from 'viem'
import { buildHashFunction } from '@anonworld/zk'

const MAX_LEAVES = 2 ** 13

export const merkleTreeRoutes = createElysia({ prefix: '/merkle-tree' }).get(
  '/:actionId',
  async ({ params }) => {
    const cached = await redis.getMerkleTree(params.actionId)
    if (cached) {
      return JSON.parse(cached)
    }

    return await buildMerkleTree(params.actionId)
  },
  {
    params: t.Object({
      actionId: t.String(),
    }),
  }
)

export const buildMerkleTree = async (actionId: string) => {
  const action = await getAction(actionId)

  const owners = await simplehash.getTokenOwners(
    action.accounts.chain_id,
    action.accounts.token_address,
    BigInt(action.actions.threshold)
  )

  const leaves = owners.map((owner) => pad(owner)).slice(0, MAX_LEAVES)
  while (leaves.length < MAX_LEAVES) {
    leaves.push(pad(zeroAddress))
  }

  const hasher = await buildHashFunction()
  const tree = new LeanIMT(
    hasher,
    leaves.sort((a, b) => a.localeCompare(b))
  )
  const exported = tree.export()

  await redis.setMerkleTree(actionId, exported, tree.root)

  return JSON.parse(exported)
}
