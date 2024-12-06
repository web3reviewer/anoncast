import { Cast } from '@anonworld/sdk/types'

export interface PostCastResponse {
  success: boolean
  cast: {
    hash: string
    author: {
      fid: number
    }
  }
  text: string
}

export interface DeleteCastResponse {
  success: boolean
}

export interface GetCastResponse {
  cast: Cast
}

export type GetCastsResponse = {
  casts: Array<Cast>
}

export interface Reveal {
  revealHash: string
  input: string
  phrase?: string
  signature?: string
  address?: string
  revealedAt?: string
}

export interface Channel {
  id: string
  url: string
  name: string
  description: string
  object: string
  created_at: number
  follower_count: number
  external_link: {
    title: string
    url: string
  }
  image_url: string
  parent_url: string
  lead: {
    object: string
    fid: number
    username: string
    display_name: string
    custody_address: string
    pfp_url: string
    profile: {
      bio: {
        text: string
        mentioned_profiles: Array<string>
      }
      location: {
        latitude: number
        longitude: number
        address: {
          city: string
          state: string
          state_code: string
          country: string
          country_code: string
        }
      }
    }
    follower_count: number
    following_count: number
    verifications: Array<string>
    verified_addresses: {
      eth_addresses: Array<string>
      sol_addresses: Array<string>
    }
    verified_accounts: Array<{
      platform: string
      username: string
    }>
    power_badge: boolean
    experimental: {
      neynar_user_score: number
    }
    viewer_context: {
      following: boolean
      followed_by: boolean
      blocking: boolean
      blocked_by: boolean
    }
  }
  moderator_fids: Array<number>
  member_count: number
  pinned_cast_hash: string
  viewer_context: {
    following: boolean
    role: string
  }
}

export interface ActionPayload {
  untrustedData: {
    fid: number
    url: string
    messageHash: string
    timestamp: number
    network: number
    buttonIndex: number
    state: string
    castId: { fid: number; hash: string }
  }
  trustedData: {
    messageBytes: string
  }
}

export type ValidateFrameResponse = {
  valid: boolean
  action: {
    object: string
    url: string
    interactor: {
      object: string
      fid: number
      username: string
      display_name: string
      pfp_url: string
      custody_address: string
      profile: {
        bio: {
          text: string
        }
        location: {
          latitude: number
          longitude: number
          address: {
            city: string
            state: string
            state_code: string
            country: string
            country_code: string
          }
        }
      }
      follower_count: number
      following_count: number
      verifications: Array<string>
      verified_addresses: {
        eth_addresses: Array<string>
        sol_addresses: Array<string>
      }
      verified_accounts: Array<{
        platform: string
        username: string
      }>
      power_badge: boolean
    }
    tapped_button: {
      index: number
    }
    state: {
      serialized: string
    }
    cast: {
      object: string
      hash: string
      fid: number
    }
    timestamp: string
  }
  signature_temporary_object: {
    note: string
    hash: string
    hash_scheme: string
    signature: string
    signature_scheme: string
    signer: string
  }
}

export interface UploadImageResponse {
  success: boolean
  status: number
  data?: {
    link: string
  }
  error?: string
}
