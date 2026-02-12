import type { MessagePage, MessageSummary, MessageType } from '../types/message'
import { request } from '../utils/request'

export const getMessageSummary = () =>
  request<MessageSummary>({
    url: '/api/answerly/v1/message/summary',
    method: 'GET',
  })

export const getMessagePage = (current: number, size: number, type: MessageType) =>
  request<MessagePage, { current: number; size: number; type: MessageType }>({
    url: '/api/answerly/v1/message/page',
    method: 'GET',
    data: { current, size, type },
  })
