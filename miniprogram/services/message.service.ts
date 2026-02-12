import { getMessageSummary } from '../api/message'
import { appStore } from '../store/app.store'

export const syncUnreadCount = async (): Promise<number> => {
  const summary = await getMessageSummary()
  const unreadCount = summary.messageSummary.reduce((sum, item) => sum + item.unreadCount, 0)
  appStore.setUnreadMessageCount(unreadCount)
  return unreadCount
}
