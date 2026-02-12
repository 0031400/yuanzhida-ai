import type { PageResult } from './api'

export interface QuestionItem {
  id: number
  title: string
  content: string
  categoryId: number
  username: string
  avatar?: string
  solvedFlag: number
  likeCount: number
  commentCount: number
  collectCount: number
  createTime: string
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
