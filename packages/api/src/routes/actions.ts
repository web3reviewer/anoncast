import { createElysia } from '../utils'
import { t } from 'elysia'
import { getAction } from '@anonworld/db'
import { CreatePost } from '../actions/create-post'
import { CopyPostFarcaster } from '../actions/copy-post-farcaster'
import { CopyPostTwitter } from '../actions/copy-post-twitter'
import { DeletePostTwitter } from '../actions/delete-post-twitter'
import { DeletePostFarcaster } from '../actions/delete-post-farcaster'
import { BaseAction } from '../actions/base'

enum ActionType {
  CREATE_POST = 'CREATE_POST',
  COPY_POST_TWITTER = 'COPY_POST_TWITTER',
  COPY_POST_FARCASTER = 'COPY_POST_FARCASTER',
  DELETE_POST_TWITTER = 'DELETE_POST_TWITTER',
  DELETE_POST_FARCASTER = 'DELETE_POST_FARCASTER',
}

async function getActionInstance(request: {
  data: any
  credentials: {
    id: string
    proof: {
      proof: number[]
      publicInputs: string[]
    }
  }[]
  actionId: string
}) {
  const action = await getAction(request.actionId)

  let actionInstance: BaseAction | undefined

  switch (action.type) {
    case ActionType.CREATE_POST: {
      actionInstance = new CreatePost(action, request.data, request.credentials)
      break
    }
    case ActionType.COPY_POST_TWITTER: {
      actionInstance = new CopyPostTwitter(action, request.data, request.credentials)
      break
    }
    case ActionType.COPY_POST_FARCASTER: {
      actionInstance = new CopyPostFarcaster(action, request.data, request.credentials)
      break
    }
    case ActionType.DELETE_POST_TWITTER: {
      actionInstance = new DeletePostTwitter(action, request.data, request.credentials)
      break
    }
    case ActionType.DELETE_POST_FARCASTER: {
      actionInstance = new DeletePostFarcaster(action, request.data, request.credentials)
      break
    }
  }

  return actionInstance
}

export const actionsRoutes = createElysia({ prefix: '/actions' }).post(
  '/execute',
  async ({ body }) => {
    const results = []
    for (const action of body.actions) {
      try {
        const actionInstance = await getActionInstance(action)
        if (!actionInstance) {
          throw new Error('Invalid action')
        }

        const response = await actionInstance.execute()
        results.push(response)
      } catch (error) {
        results.push({ success: false, error: (error as Error).message })
      }
    }

    return { results }
  },
  {
    body: t.Object({
      actions: t.Array(
        t.Object({
          actionId: t.String(),
          data: t.Any(),
          credentials: t.Array(
            t.Object({
              id: t.String(),
              proof: t.Object({
                proof: t.Array(t.Number()),
                publicInputs: t.Array(t.String()),
              }),
            })
          ),
        })
      ),
    }),
  }
)
