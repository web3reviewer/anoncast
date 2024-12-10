import {
  Action,
  createPost,
  createPostRelationship,
  getPost,
  getPostChildren,
} from '@anonworld/db'
import { neynar } from '../services/neynar'
import { TwitterConfig, TwitterService } from '../services/twitter'

export type PromotePostActionMetadata = {
  fid: number
  twitterConfig?: TwitterConfig
}

export type PromotePostActionData = {
  hash: string
  reply?: boolean
}

export class PromotePostAction {
  private metadata: PromotePostActionMetadata
  private data: PromotePostActionData

  constructor(action: Action, data: any) {
    this.metadata = action.metadata as PromotePostActionMetadata
    this.data = data
  }

  async execute() {
    const cast = await neynar.getCast(this.data.hash)
    if (!cast) {
      return { success: false }
    }

    let post = await getPost(this.data.hash)
    if (!post) {
      await createPost({
        hash: this.data.hash,
        fid: cast.cast.author.fid,
        data: {
          text: cast.cast.text,
          embeds: cast.cast.embeds.filter((embed) => embed.url).map((embed) => embed.url),
          quote: cast.cast.embeds.find((e) => e.cast)?.cast?.hash ?? null,
          channel: cast.cast.channel?.id ?? null,
          parent: cast.cast.parent_hash ?? null,
        },
        reveal_hash: null,
      })
      post = await getPost(this.data.hash)
    }

    const unableToPromoteRegex = [
      /.*@clanker.*launch.*/i,
      /.*dexscreener.com.*/i,
      /.*dextools.io.*/i,
      /.*0x[a-fA-F0-9]{40}.*/i,
      /(^|\s)\$(?!ANON\b)[a-zA-Z]+\b/i,
    ]
    if (
      this.metadata.twitterConfig &&
      (unableToPromoteRegex.some((regex) => cast.cast.text.match(regex)) ||
        cast.cast.embeds?.some((embed) =>
          unableToPromoteRegex.some((regex) => embed.url?.match(regex))
        ))
    ) {
      return {
        success: false,
      }
    }

    const children = await getPostChildren([this.data.hash])
    const hasFarcasterRelationship = children.some(
      (relationship) =>
        relationship.target === 'farcaster' &&
        relationship.target_account === this.metadata.fid?.toString()
    )
    const hasTwitterRelationship = children.some(
      (relationship) =>
        relationship.target === 'twitter' &&
        relationship.target_account === this.metadata.twitterConfig?.username
    )

    let hash: string | undefined
    let tweetId: string | undefined

    if (this.metadata.fid && !hasFarcasterRelationship) {
      const parentHash = cast.cast.parent_hash
      const channelId = cast.cast.channel?.id
      const embeds: string[] = []
      let quoteHash: string | undefined
      for (const embed of cast.cast.embeds || []) {
        if (embed.url) {
          embeds.push(embed.url)
        } else if (embed.cast) {
          quoteHash = embed.cast.hash
        }
      }

      const response = await neynar.createCast({
        fid: this.metadata.fid,
        text: cast.cast.text,
        embeds,
        quote: quoteHash,
        parent: parentHash,
        channel: channelId,
      })
      if (response.success) {
        hash = response.cast.hash

        await createPost({
          hash,
          fid: this.metadata.fid,
          data: post.data,
          reveal_hash: post.reveal_hash,
        })
        await createPostRelationship({
          post_hash: this.data.hash,
          target: 'farcaster',
          target_account: this.metadata.fid.toString(),
          target_id: hash,
        })
      } else {
        return { success: false }
      }
    }

    const isTweetable = !cast.cast.text.includes('@bankr')

    if (this.metadata.twitterConfig && !hasTwitterRelationship && isTweetable) {
      const twitter = new TwitterService(this.metadata.twitterConfig)
      const response = await twitter.promoteToTwitter(
        cast.cast,
        undefined,
        this.data.reply
      )
      if (response.tweetId) {
        tweetId = response.tweetId
        if (hash) {
          await createPostRelationship({
            post_hash: hash,
            target: 'twitter',
            target_account: this.metadata.twitterConfig.username,
            target_id: tweetId,
          })
        }
        await createPostRelationship({
          post_hash: this.data.hash,
          target: 'twitter',
          target_account: this.metadata.twitterConfig.username,
          target_id: tweetId,
        })
      }
    }

    return { success: true, hash, tweetId }
  }
}
