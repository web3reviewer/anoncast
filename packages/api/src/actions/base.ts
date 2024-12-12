import { merkleMembership } from '@anonworld/zk'

import { ProofData } from '@anonworld/zk'
import { redis } from '../services/redis'
import { hashMessage } from 'viem'
import { Action, logActionExecution, validateMerkleRoots } from '@anonworld/db'

type Credential = {
  id: string
  proof: {
    proof: number[]
    publicInputs: string[]
  }
}

export abstract class BaseAction<TMetadata = any, TData = any> {
  action!: Action<TMetadata>
  data!: TData
  proofs: ProofData[]

  roots: string[] = []

  constructor(action: Action, data: TData, credentials: Credential[]) {
    this.action = action as Action<TMetadata>
    this.data = data
    this.proofs = credentials.map(({ proof }) => ({
      proof: new Uint8Array(proof.proof),
      publicInputs: proof.publicInputs,
    }))
  }

  async getMerkleRoots() {
    const roots = []
    for (const proof of this.proofs) {
      const verified = await merkleMembership.verify(proof)
      if (verified) {
        roots.push(proof.publicInputs[0])
      }
    }
    return roots
  }

  async validate() {
    this.roots = await this.getMerkleRoots()
    if (this.roots.length === 0) {
      throw new Error('Invalid merkle tree root')
    }

    const rootValidations = await validateMerkleRoots(this.roots)
    if (rootValidations.length === 0) {
      throw new Error('Invalid merkle tree root')
    }

    if (
      await redis.actionOccurred(this.action.id, hashMessage(JSON.stringify(this.data)))
    ) {
      throw new Error('Action already occurred')
    }
  }

  async execute() {
    await this.validate()

    try {
      const response = await this.handle()

      await logActionExecution({
        action_id: this.action.id,
        action_data: this.data,
        status: 'SUCCESS',
        response,
      })

      await redis.markActionOccurred(
        this.action.id,
        hashMessage(JSON.stringify(this.data))
      )

      return response
    } catch (error) {
      await logActionExecution({
        action_id: this.action.id,
        action_data: this.data,
        status: 'FAILED',
        error: error,
      })
      throw error
    }
  }

  abstract handle(): Promise<any>
}
