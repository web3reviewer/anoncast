export type ActionRequest = {
  data: any
  credentials: {
    id: string
    proof: {
      proof: number[]
      publicInputs: string[]
    }
  }[]
  actionId: string
}

export enum ActionType {
  CREATE_POST = 'CREATE_POST',
  COPY_POST_TWITTER = 'COPY_POST_TWITTER',
  COPY_POST_FARCASTER = 'COPY_POST_FARCASTER',
  DELETE_POST_TWITTER = 'DELETE_POST_TWITTER',
  DELETE_POST_FARCASTER = 'DELETE_POST_FARCASTER',
}
