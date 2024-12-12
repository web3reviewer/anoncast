import { createElysia } from '../utils'
import { t } from 'elysia'
import { getAction } from '@anonworld/db'
import { CreatePostAction } from '../actions/create-post'
import { DeletePostAction } from '../actions/delete-post'
import { PromotePostAction } from '../actions/promote-post'
import { BaseAction } from '../actions/base'

enum ActionType {
  CREATE_POST = 'CREATE_POST',
  DELETE_POST = 'DELETE_POST',
  PROMOTE_POST = 'PROMOTE_POST',
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
      actionInstance = new CreatePostAction(action, request.data, request.credentials)
      break
    }
    case ActionType.DELETE_POST: {
      actionInstance = new DeletePostAction(action, request.data, request.credentials)
      break
    }
    case ActionType.PROMOTE_POST: {
      actionInstance = new PromotePostAction(action, request.data, request.credentials)
      break
    }
  }

  return actionInstance
}

export const actionsRoutes = createElysia({ prefix: '/actions' }).post(
  '/submit',
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
