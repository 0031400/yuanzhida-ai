import type { PageResult } from './api'

export interface CommentItem {
  id: number
  questionId: number
  parentCommentId?: number
  topCommentId?: number
  content: string
  images?: string
  username: string
  commentTo?: string | null
  avatar?: string
  likeCount: number
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

export type CommentPage = PageResult<CommentItem>
