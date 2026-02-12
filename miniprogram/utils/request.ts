import { envConfig } from '../config'
import { authStore } from '../store/auth.store'
import type { ApiResponse, RequestError } from '../types/api'
import { getErrorMessage } from './error-map'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestOptions<TData> {
  url: string
  method?: HttpMethod
  data?: TData
  authRequired?: boolean
  showErrorToast?: boolean
  headers?: WechatMiniprogram.IAnyObject
}

const SUCCESS_CODE = '0'
const UNAUTHORIZED_CODE = 'A000204'

const joinUrl = (url: string): string => {
  if (/^https?:\/\//.test(url)) return url
  return `${envConfig.baseUrl}${url}`
}

const showErrorToast = (message: string): void => {
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000,
  })
}

const handleUnauthorized = (): void => {
  authStore.clearAuth()
  if (getCurrentPages().length === 0) return
  wx.navigateTo({
    url: '/pages/login/login',
    fail: () => {
      // login page may be unavailable before MVP pages are scaffolded.
    },
  })
}

export const request = <TResponse, TData = WechatMiniprogram.IAnyObject>(
  options: RequestOptions<TData>,
): Promise<TResponse> => {
  const {
    url,
    method = 'GET',
    data,
    authRequired = true,
    showErrorToast: shouldShowErrorToast = true,
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
          const error: RequestError = { code: 'NETWORK_EMPTY_RESPONSE', message: '服务端返回为空' }
          if (shouldShowErrorToast) showErrorToast(error.message)
          reject(error)
          return
        }

        if (payload.code === SUCCESS_CODE) {
          resolve(payload.data)
          return
        }

        const message = getErrorMessage(payload.code, payload.message)
        const error: RequestError = { code: payload.code, message }
        if (payload.code === UNAUTHORIZED_CODE) handleUnauthorized()
        if (shouldShowErrorToast) showErrorToast(message)
        reject(error)
      },
      fail: () => {
        const error: RequestError = { code: 'NETWORK_FAIL', message: '网络异常，请稍后重试' }
        if (shouldShowErrorToast) showErrorToast(error.message)
        reject(error)
      },
    })
  })
}
