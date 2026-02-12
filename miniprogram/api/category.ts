import type { CategoryItem } from '../types/category'
import { request } from '../utils/request'

export const getCategoryList = () =>
  request<CategoryItem[]>({
    url: '/api/answerly/v1/category',
    method: 'GET',
    authRequired: false,
  })
