import type { CommentPage, CommentPageQuery } from '../types/comment'
import { request } from '../utils/request'

export const getQuestionCommentPage = (query: CommentPageQuery) =>
  request<CommentPage, CommentPageQuery>({
    url: '/api/answerly/v1/comment/page',
    method: 'GET',
    data: query,
    authRequired: false,
  })
