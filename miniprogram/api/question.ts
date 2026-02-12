import type {
  PublishQuestionPayload,
  QuestionDetail,
  QuestionItem,
  QuestionPage,
  QuestionPageQuery,
  UpdateQuestionPayload,
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

export const getQuestionSuggest = (keyword: string) =>
  request<string[], { keyword: string }>({
    url: '/api/answerly/v1/question/suggest',
    method: 'GET',
    data: { keyword },
    authRequired: false,
  })

export const getQuestionDetail = (id: number) =>
  request<QuestionDetail>({
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

export const updateQuestion = (payload: UpdateQuestionPayload) =>
  request<null, UpdateQuestionPayload>({
    url: '/api/answerly/v1/question',
    method: 'PUT',
    data: payload,
  })

export const deleteQuestion = (id: number) =>
  request<null>({
    url: `/api/answerly/v1/question?id=${id}`,
    method: 'DELETE',
  })

export const resolveQuestion = (id: number) =>
  request<null, { id: number }>({
    url: '/api/answerly/v1/question/resolved',
    method: 'POST',
    data: { id },
  })

export const toggleQuestionCollect = (payload: { id: number; entityUserId?: number }) =>
  request<null, { id: number; entityUserId?: number }>({
    url: '/api/answerly/v1/question/collect',
    method: 'POST',
    data: {
      id: payload.id,
      entityUserId: payload.entityUserId,
    },
  })

export const toggleQuestionLike = (payload: { id: number; entityUserId?: number }) =>
  request<null, { id: number; entityUserId?: number }>({
    url: '/api/answerly/v1/question/like',
    method: 'POST',
    data: {
      id: payload.id,
      entityUserId: payload.entityUserId,
    },
  })

export const getMyCollectQuestionPage = (current: number, size: number) =>
  request<QuestionPage, { current: number; size: number }>({
    url: '/api/answerly/v1/question/collect/my/page',
    method: 'GET',
    data: { current, size },
  })

export const getMyRecentQuestionPage = (current: number, size: number) =>
  request<QuestionPage, { current: number; size: number }>({
    url: '/api/answerly/v1/question/recent/page',
    method: 'GET',
    data: { current, size },
  })

export const getMyQuestionPage = (current: number, size: number) =>
  request<QuestionPage, { current: number; size: number }>({
    url: '/api/answerly/v1/question/my/page',
    method: 'GET',
    data: { current, size },
  })
