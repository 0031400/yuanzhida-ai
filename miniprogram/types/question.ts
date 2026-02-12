import type { PageResult } from './api'

export interface QuestionItem {
  id: number
  title: string
  content: string
  userId?: number
  categoryId: number
  category?: number
  username: string
  avatar?: string
  solvedFlag: number
  viewCount?: number
  likeCount: number
  commentCount: number
  collectCount: number
  createTime: string
}

export interface QuestionDetail extends QuestionItem {
  images?: string
  updateTime?: string
  likeStatus?: string
  collectStatus?: string
}

export interface QuestionPageQuery {
  current: number
  size: number
  categoryId?: number
  keyword?: string
  solvedFlag?: number
}

export interface PublishQuestionPayload {
  title: string
  content: string
  categoryId: number
  images: string[]
}

export type QuestionPage = PageResult<QuestionItem>
