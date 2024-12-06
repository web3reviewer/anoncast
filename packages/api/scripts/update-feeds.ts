import { getAllFarcasterAccounts } from '@anonworld/db'
import { buildFeeds } from '../src/routes/feeds'

const main = async () => {
  while (true) {
    try {
      const accounts = await getAllFarcasterAccounts()
      for (const account of accounts) {
        console.log(`Building feeds for ${account.fid}`)
        await buildFeeds(account.fid)
      }
      console.log('Feeds updated, waiting 30 seconds...')
      await new Promise((resolve) => setTimeout(resolve, 30000))
    } catch (error) {
      console.error('Error updating feeds:', error)
      await new Promise((resolve) => setTimeout(resolve, 30000))
    }
  }
}

main()
  .catch(console.error)
  .then(() => {
    process.exit(0)
  })
