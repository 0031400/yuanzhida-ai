import type {
  PublishQuestionPayload,
  QuestionItem,
  QuestionPage,
  QuestionPageQuery,
} from '../types/question'
import { request } from '../utils/request'

const joinImages = (images: string[]) => images.join(',')

export const getQuestionPage = (query: QuestionPageQuery) =>
  request<QuestionPage, QuestionPageQuery>({
    url: '/api/answerly/v1/question/page',
    method: 'GET',
    data: query,
    authRequired: false,
  })

export const getQuestionDetail = (id: number) =>
  request<QuestionItem>({
    url: `/api/answerly/v1/question/${id}`,
    method: 'GET',
    authRequired: false,
  })

export const publishQuestion = (payload: PublishQuestionPayload) =>
  request<null, { title: string; content: string; categoryId: number; images: string }>({
    url: '/api/answerly/v1/question',
    method: 'POST',
    data: {
      title: payload.title,
      content: payload.content,
      categoryId: payload.categoryId,
      images: joinImages(payload.images),
    },
  })
