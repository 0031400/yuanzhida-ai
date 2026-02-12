import type { PageResult } from './api'

export interface CommentItem {
  id: number
  questionId: number
  content: string
  username: string
  avatar?: string
  likeCount: number
  createTime: string
}

export interface CommentPageQuery {
  current: number
  size: number
  id: number
}

export type CommentPage = PageResult<CommentItem>
