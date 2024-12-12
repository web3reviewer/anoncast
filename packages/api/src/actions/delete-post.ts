import {
  deletePost as deletePostDb,
  deletePostRelationship,
  getPostChildren,
} from '@anonworld/db'
import { neynar } from '../services/neynar'
import { twitter } from '../services/twitter'
import { BaseAction } from './base'

export type DeletePostActionMetadata = {
  fid: number
  twitter?: string
}

export type DeletePostActionData = {
  hash: string
}

export class DeletePostAction extends BaseAction<
  DeletePostActionMetadata,
  DeletePostActionData
> {
  async handle() {
    const children = await getPostChildren([this.data.hash])
    for (const child of children) {
      if (child.target === 'farcaster') {
        if (this.action.metadata.fid === Number(child.target_account)) continue
        await neynar.deleteCast({
          fid: this.action.metadata.fid,
          hash: child.target_id,
        })
        await deletePostDb(child.target_id)
      } else if (child.target === 'twitter' && this.action.metadata.twitter) {
        await twitter.deleteTweet(this.action.metadata.twitter, child.target_id)
      } else {
        continue
      }

      await deletePostRelationship({
        post_hash: this.data.hash,
        target: child.target,
        target_account: child.target_account,
      })
    }

    return { success: true }
  }
}
