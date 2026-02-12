import type { CommentPage, CommentPageQuery, PublishCommentPayload } from '../types/comment'
import { request } from '../utils/request'

export const getQuestionCommentPage = (query: CommentPageQuery) =>
  request<CommentPage, CommentPageQuery>({
    url: '/api/answerly/v1/comment/page',
    method: 'GET',
    data: query,
    authRequired: false,
  })

export const publishComment = (payload: PublishCommentPayload) =>
  request<null, PublishCommentPayload>({
    url: '/api/answerly/v1/comment',
    method: 'POST',
    data: {
      questionId: payload.questionId,
      content: payload.content,
      parentCommentId: payload.parentCommentId !== undefined ? payload.parentCommentId : 0,
      topCommentId: payload.topCommentId !== undefined ? payload.topCommentId : 0,
      images: payload.images !== undefined ? payload.images : '',
    },
  })
