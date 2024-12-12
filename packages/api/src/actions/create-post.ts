import { createPost as createPostDb, createPostCredentials, Action } from '@anonworld/db'
import { neynar } from '../services/neynar'

export type CreatePostActionMetadata = {
  fid: number
}

export type CreatePostActionData = {
  text?: string
  embeds?: string[]
  quote?: string
  channel?: string
  parent?: string
  revealHash?: string
  roots: string[]
}

export class CreatePostAction {
  private metadata: CreatePostActionMetadata
  private data: CreatePostActionData

  constructor(action: Action, data: any) {
    this.metadata = action.metadata as CreatePostActionMetadata
    this.data = data
  }

  async execute() {
    const { text, embeds, quote, channel, parent, revealHash } = this.data

    const bannedWords = ['nigger', 'n1gg3r', 'nigga', 'n1gga', 'n1gger', 'n1gga']

    if (
      text &&
      bannedWords.some((word) => text.toLowerCase().includes(word.toLowerCase()))
    ) {
      return {
        success: false,
      }
    }

    const response = await neynar.createCast({
      fid: this.metadata.fid,
      text,
      embeds,
      quote,
      channel,
      parent,
    })

    if (!response.success) {
      throw new Error('Failed to create cast')
    }

    await createPostDb({
      hash: response.cast.hash,
      fid: this.metadata.fid,
      data: { ...this.data, revealHash: undefined, roots: undefined },
      reveal_hash: this.data.revealHash,
    })

    await createPostCredentials(response.cast.hash, this.data.roots)

    return {
      success: true,
      hash: response.cast.hash,
    }
  }
}
