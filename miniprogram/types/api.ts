export type BizCode = string

export interface ApiResponse<T> {
  code: BizCode
  message: string | null
  data: T
}

export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages?: number
}

export interface RequestError {
  code: BizCode
  message: string
}
