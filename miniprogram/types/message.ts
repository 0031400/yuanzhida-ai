import type { PageResult } from './api'

export type MessageType = 'system' | 'like' | 'comment' | 'collect' | 'useful'

export interface MessageItem {
  id: number
  content: string
  type: MessageType
  status: number
  createTime: string
}

export interface MessageSummaryItem {
  type: MessageType
  totalCount: number
  unreadCount: number
}

export interface MessageSummary {
  messageSummary: MessageSummaryItem[]
}

export type MessagePage = PageResult<MessageItem>
