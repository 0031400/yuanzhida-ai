import type { CommentPage, CommentPageQuery, PublishCommentPayload, UpdateCommentPayload } from '../types/comment'
import { request } from '../utils/request'

export const getQuestionCommentPage = (query: CommentPageQuery) =>
  request<CommentPage, CommentPageQuery>({
    url: '/api/answerly/v1/comment/page',
    method: 'GET',
    data: query,
    authRequired: true,
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

export const likeComment = (payload: { id: number; entityUserId?: number }) =>
  request<null, { id: number; entityUserId?: number }>({
    url: '/api/answerly/v1/comment/like',
    method: 'POST',
    data: {
      id: payload.id,
      entityUserId: payload.entityUserId,
    },
  })

export const deleteComment = (id: number) =>
  request<null>({
    url: `/api/answerly/v1/comment?id=${id}`,
    method: 'DELETE',
  })

export const toggleCommentUseful = (id: number) =>
  request<null, { id: number }>({
    url: '/api/answerly/v1/comment/useful',
    method: 'POST',
    data: { id },
  })

export const getMyCommentPage = (current: number, size: number) =>
  request<CommentPage, { current: number; size: number }>({
    url: '/api/answerly/v1/comment/my/page',
    method: 'GET',
    data: { current, size },
  })

export const updateComment = (payload: UpdateCommentPayload) =>
  request<null, UpdateCommentPayload>({
    url: '/api/answerly/v1/comment',
    method: 'PUT',
    data: payload,
  })
