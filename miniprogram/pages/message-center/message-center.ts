import { getMessagePage, getMessageSummary } from '../../api/message'
import { authStore } from '../../store/auth.store'
import { appStore } from '../../store/app.store'
import type { MessageItem, MessageSummaryItem, MessageType } from '../../types/message'
import { formatFromNow } from '../../utils/day'
import { pickErrorMessage } from '../../utils/error'

interface MessageTypeMeta {
  type: MessageType
  label: string
}

interface MessageTypeCard extends MessageTypeMeta {
  totalCount: number
  unreadCount: number
}

interface MessageViewItem extends MessageItem {
  timeText: string
  statusText: string
}

type TabChangeEvent = WechatMiniprogram.CustomEvent<{ index: number; title: string; name: string }>

const PAGE_SIZE = 10
const MESSAGE_TYPE_META: MessageTypeMeta[] = [
  { type: 'comment', label: '评论与回复' },
  { type: 'like', label: '点赞通知' },
  { type: 'collect', label: '收藏通知' },
  { type: 'useful', label: '有用通知' },
  { type: 'system', label: '系统消息' },
]

const createDefaultCards = (): MessageTypeCard[] =>
  MESSAGE_TYPE_META.map((item) => ({
    type: item.type,
    label: item.label,
    totalCount: 0,
    unreadCount: 0,
  }))

Page({
  data: {
    isLoggedIn: false,
    loadingSummary: false,
    loadingMessages: false,
    loadingMore: false,
    refreshing: false,
    summaryCards: createDefaultCards(),
    activeType: MESSAGE_TYPE_META[0].type as MessageType,
    activeTab: 0,
    messages: [] as MessageViewItem[],
    hasMore: true,
    current: 1,
    size: PAGE_SIZE,
  },
  onShow() {
    void this.bootstrap()
  },
  async bootstrap(): Promise<void> {
    const auth = authStore.hydrate()
    if (!auth.isLoggedIn) {
      this.setData({
        isLoggedIn: false,
        loadingSummary: false,
        loadingMessages: false,
        loadingMore: false,
        refreshing: false,
        summaryCards: createDefaultCards(),
        messages: [],
        hasMore: true,
        current: 1,
      })
      return
    }

    this.setData({
      isLoggedIn: true,
      loadingSummary: true,
      refreshing: true,
    })

    try {
      const summary = await getMessageSummary()
      const cards = this.mergeSummary(summary.messageSummary)
      const unreadCount = cards.reduce((sum, item) => sum + item.unreadCount, 0)
      appStore.setUnreadMessageCount(unreadCount)

      const activeType = this.pickInitialType(cards)
      const activeTab = this.getTabIndex(activeType)

      this.setData({
        summaryCards: cards,
        activeType,
        activeTab,
        messages: [],
        hasMore: true,
        current: 1,
      })

      await this.loadMessages(true)
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '消息加载失败'),
        icon: 'none',
      })
    } finally {
      this.setData({
        loadingSummary: false,
        refreshing: false,
      })
    }
  },
  mergeSummary(items: MessageSummaryItem[]): MessageTypeCard[] {
    const map: Record<MessageType, MessageSummaryItem | null> = {
      comment: null,
      like: null,
      collect: null,
      useful: null,
      system: null,
    }

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]
      map[item.type] = item
    }

    return MESSAGE_TYPE_META.map((item) => {
      const summary = map[item.type]
      return {
        type: item.type,
        label: item.label,
        totalCount: summary ? summary.totalCount : 0,
        unreadCount: summary ? summary.unreadCount : 0,
      }
    })
  },
  pickInitialType(cards: MessageTypeCard[]): MessageType {
    const unreadCard = cards.find((item) => item.unreadCount > 0)
    if (unreadCard) return unreadCard.type
    return cards[0].type
  },
  getTabIndex(type: MessageType): number {
    const index = MESSAGE_TYPE_META.findIndex((item) => item.type === type)
    return index >= 0 ? index : 0
  },
  async loadMessages(reset: boolean): Promise<void> {
    if (!this.data.isLoggedIn) return
    if (!reset && (this.data.loadingMessages || this.data.loadingMore || !this.data.hasMore)) return

    const current = reset ? 1 : this.data.current
    this.setData({
      loadingMessages: reset,
      loadingMore: !reset,
    })

    try {
      const page = await getMessagePage(current, this.data.size, this.data.activeType)
      const records = page.records.map((item) => this.toMessageView(item))
      const merged = reset ? records : [...this.data.messages, ...records]
      const hasMore = page.current * page.size < page.total
      this.setData({
        messages: merged,
        hasMore,
        current: current + 1,
      })
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '消息加载失败'),
        icon: 'none',
      })
    } finally {
      this.setData({
        loadingMessages: false,
        loadingMore: false,
        refreshing: false,
      })
    }
  },
  toMessageView(item: MessageItem): MessageViewItem {
    return {
      ...item,
      timeText: formatFromNow(item.createTime),
      statusText: item.status === 1 ? '未读' : '已读',
    }
  },
  onTypeTap(event: WechatMiniprogram.TouchEvent): void {
    const rawType = String(event.currentTarget.dataset.type || '') as MessageType
    if (!rawType || rawType === this.data.activeType) return
    this.switchType(rawType)
  },
  onTabChange(event: TabChangeEvent): void {
    const index = Number(event.detail.index)
    if (!Number.isFinite(index)) return
    const next = MESSAGE_TYPE_META[index]
    if (!next || next.type === this.data.activeType) return
    this.switchType(next.type)
  },
  switchType(type: MessageType): void {
    const activeTab = this.getTabIndex(type)
    this.setData({
      activeType: type,
      activeTab,
      messages: [],
      hasMore: true,
      current: 1,
      refreshing: true,
    })
    void this.loadMessages(true)
  },
  onScrollToLower(): void {
    void this.loadMessages(false)
  },
  onRefresherRefresh(): void {
    if (this.data.refreshing) return
    this.setData({ refreshing: true })
    void this.bootstrap()
  },
  onGoLogin(): void {
    wx.navigateTo({
      url: '/pages/login/login',
    })
  },
})
