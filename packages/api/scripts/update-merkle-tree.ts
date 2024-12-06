import { getAllActions } from '@anonworld/db'
import { buildMerkleTree } from '../src/routes/merkle-tree'

const main = async () => {
  const actions = await getAllActions()
  for (const action of actions) {
    console.log(`Building merkle tree for ${action.id}`)
    await buildMerkleTree(action.id)
  }
}

main()
  .catch(console.error)
  .then(() => {
    console.log('Merkle trees updated')
    process.exit(0)
  })
