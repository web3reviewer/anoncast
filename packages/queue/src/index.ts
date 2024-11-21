import { QueueName, getWorker, getQueue } from './utils'
import { handler } from './handler'
import { Redis } from 'ioredis'
import { ProofType } from '@anon/utils/src/proofs'

const redis = new Redis(process.env.REDIS_URL as string)

const run = async () => {
  // Manual run
  if (process.argv[2]) {
    const queue = getQueue(QueueName.Default)
    const job = await queue.getJob(process.argv[2])
    if (job) {
      const result = await handler(job.data)
      console.log(JSON.stringify(result, null, 2))
    }
    return
  }

  // Start worker
  const usePromotePost = !!process.argv[2]
  const queueName = usePromotePost ? QueueName.PromotePost : QueueName.Default
  const worker = getWorker(queueName, async (job) => {
    if (job.data.type === ProofType.PROMOTE_POST) {
      const rateLimit = await redis.get('twitter:rate-limit')
      if (rateLimit) {
        job.moveToDelayed(parseInt(rateLimit) * 1000)
        console.log(`[${job.id}] rate limit hit, delaying ${job.data.type}`)
        return
      }
    }

    console.log(`[${job.id}] started ${job.data.type}`)
    await handler(job.data)
    console.log(`[${job.id}] completed ${job.data.type}`)
  })

  worker.on('failed', (job, err) => {
    if (job) {
      console.log(`[${job.id}] failed with ${err.message}`)
    }
  })
}

run().catch((e) => {
  console.error(e)
})
