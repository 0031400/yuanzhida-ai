import { envConfig } from '../config/index'
import { authStore } from '../store/auth.store'
import type { ApiResponse } from '../types/api'
import { getErrorMessage } from './error-map'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestOptions<TData> {
  url: string
  method?: HttpMethod
  data?: TData
  authRequired?: boolean
  headers?: WechatMiniprogram.IAnyObject
}

const SUCCESS_CODE = '0'

const joinUrl = (url: string): string => {
  if (/^https?:\/\//.test(url)) return url
  return `${envConfig.baseUrl}${url}`
}

export const request = <TResponse, TData = WechatMiniprogram.IAnyObject>(
  options: RequestOptions<TData>,
): Promise<TResponse> => {
  const {
    url,
    method = 'GET',
    data,
    authRequired = true,
    headers = {},
  } = options

  const requestHeaders: WechatMiniprogram.IAnyObject = {
    'content-type': 'application/json',
    ...headers,
  }

  if (authRequired) {
    const { username, token } = authStore.getAuthHeaders()
    if (username && token) {
      requestHeaders.username = username
      requestHeaders.token = token
    }
  }

  return new Promise<TResponse>((resolve, reject) => {
    wx.request({
      url: joinUrl(url),
      method,
      data,
      timeout: envConfig.timeout,
      header: requestHeaders,
      success: (res) => {
        const payload = res.data as ApiResponse<TResponse> | undefined
        if (!payload) {
          reject('服务端返回为空')
          return
        }

        if (typeof payload.code !== 'string') {
          reject('响应格式错误')
          return
        }

        if (payload.code === SUCCESS_CODE) {
          resolve(payload.data)
          return
        }

        const message = getErrorMessage(payload.code, payload.message)
        reject(message)
      },
      fail: () => {
        reject('网络异常，请稍后重试')
      },
    })
  })
}
