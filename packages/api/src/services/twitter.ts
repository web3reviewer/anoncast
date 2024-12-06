import https from 'node:https'
import { SendTweetV2Params, TwitterApi } from 'twitter-api-v2'
import { neynar } from './neynar'
import { Cast } from './neynar/types'

export type TwitterConfig = {
  username: string
  appKey: string
  appSecret: string
  accessToken: string
  accessSecret: string
}

export class TwitterService {
  private readonly client: TwitterApi

  constructor(config: TwitterConfig) {
    this.client = new TwitterApi({
      appKey: config.appKey,
      appSecret: config.appSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessSecret,
    })
  }

  async deleteTweet(tweetId: string) {
    return await this.client.v2.deleteTweet(tweetId)
  }

  async promoteToTwitter(cast: Cast, parentTweetId?: string, asReply?: boolean) {
    let quoteTweetId: string | undefined
    let replyToTweetId: string | undefined
    let farcasterCashHash: string | undefined
    let imageUrl: string | undefined
    const otherEmbeds: string[] = []

    if (cast.embeds) {
      for (const embed of cast.embeds) {
        if (embed.url?.includes('x.com') || embed.url?.includes('twitter.com')) {
          const url = new URL(embed.url)
          const tweetId = url.pathname.split('/').pop()
          if (tweetId) {
            if (asReply) {
              replyToTweetId = tweetId
            } else {
              quoteTweetId = tweetId
            }
          }
        } else if (embed.cast) {
          farcasterCashHash = embed.cast.hash
        } else if (embed.metadata?.content_type?.startsWith('image')) {
          imageUrl = embed.url
        } else if (embed.url) {
          otherEmbeds.push(embed.url)
        }
      }
    }

    let text = cast.text
    const usedUrls = new Set<string>()
    for (const embed of otherEmbeds) {
      if (!usedUrls.has(embed)) {
        text += `\n\n${embed}`
        usedUrls.add(embed)
      }
    }

    const images: string[] = []
    if (farcasterCashHash) {
      images.push(
        `https://client.warpcast.com/v2/cast-image?castHash=${farcasterCashHash}`
      )
    }
    if (imageUrl) {
      images.push(imageUrl)
    }

    return await this.formatAndSubmitToTwitter(
      text,
      images,
      quoteTweetId,
      parentTweetId || replyToTweetId
    )
  }

  async formatAndSubmitToTwitter(
    text: string,
    images: string[],
    quoteTweetId?: string,
    replyToTweetId?: string
  ) {
    const mediaIds: string[] = []
    for (const image of images) {
      const { data: binaryData, mimeType } = await new Promise<{
        data: Buffer
        mimeType: string
      }>((resolve, reject) => {
        https
          .get(image, (res) => {
            res.setEncoding('binary')
            let data = Buffer.alloc(0)

            res.on('data', (chunk) => {
              data = Buffer.concat([data, Buffer.from(chunk, 'binary')])
            })
            res.on('end', () => {
              const mimeType = res.headers['content-type'] || 'image/jpeg'
              resolve({ data, mimeType })
            })
          })
          .on('error', (e) => {
            reject(e)
          })
      })
      mediaIds.push(
        await this.client.v1.uploadMedia(binaryData as unknown as Buffer, {
          mimeType,
        })
      )
    }

    const params: SendTweetV2Params = {}
    if (mediaIds.length > 0) {
      params.media = {
        media_ids: mediaIds.slice(0, 4) as [string, string, string, string],
      }
    }

    if (quoteTweetId) {
      params.quote_tweet_id = quoteTweetId
    }
    if (replyToTweetId) {
      params.reply = {
        in_reply_to_tweet_id: replyToTweetId,
      }
    }

    const mentions = text.match(/@[\w-]+(?:\.eth)?/g)

    if (mentions) {
      for (const mention of mentions) {
        try {
          const farcasterUser = await neynar.getUserByUsername(mention.slice(1))

          if (!farcasterUser.user) {
            continue
          }

          const connectedTwitter = farcasterUser.user.verified_accounts?.find(
            (va) => va.platform === 'x'
          )

          if (connectedTwitter) {
            text = text.replace(mention, `@${connectedTwitter.username}`)
          }
        } catch {
          continue
        }
      }
    }

    const result = await this.client.v2.tweet(text, params)
    if (result?.data?.id) {
      return { success: true, tweetId: result.data.id }
    }

    throw new Error(
      `Failed to tweet: ${result.errors?.map((e) => JSON.stringify(e)).join(' ')}`
    )
  }
}
