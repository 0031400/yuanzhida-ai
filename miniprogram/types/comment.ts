import type { PageResult } from './api'

export interface CommentItem {
  id: number
  questionId: number
  userId?: number
  parentCommentId?: number
  topCommentId?: number
  content: string
  images?: string
  username: string
  commentTo?: string | null
  avatar?: string
  likeCount: number
  likeStatus?: string
  useful?: number
  createTime: string
  childComments?: CommentItem[]
}

export interface CommentPageQuery {
  current: number
  size: number
  id: number
}

export interface PublishCommentPayload {
  questionId: number
  content: string
  parentCommentId?: number
  topCommentId?: number
  images?: string
}

export interface UpdateCommentPayload {
  id: number
  content: string
  images?: string
}

export type CommentPage = PageResult<CommentItem>
