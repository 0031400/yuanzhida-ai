import type { LoginPayload, LoginResult, RegisterPayload, UserProfile } from '../types/user'
import { envConfig } from '../config/index'
import { STORAGE_KEYS, storage } from '../utils/storage'
import { request } from '../utils/request'

export interface CaptchaResult {
  imageBase64: string
  cookie: string
}

const pickCookie = (header: WechatMiniprogram.IAnyObject): string => {
  const rawCookie = header['Set-Cookie'] ?? header['set-cookie']
  if (!rawCookie) return ''
  const cookieText = Array.isArray(rawCookie) ? rawCookie[0] : String(rawCookie)
  return cookieText.split(';')[0] ?? ''
}

export const fetchLoginCaptcha = (): Promise<CaptchaResult> =>
  new Promise((resolve, reject) => {
    wx.request({
      url: `${envConfig.baseUrl}/api/answerly/v1/user/captcha`,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: envConfig.timeout,
      success: (res) => {
        const cookie = pickCookie(res.header)
        if (!cookie || !(res.data instanceof ArrayBuffer)) {
          reject(new Error('验证码获取失败'))
          return
        }
        storage.setString(STORAGE_KEYS.captchaOwner, cookie)
        const imageBase64 = wx.arrayBufferToBase64(res.data)
        resolve({
          imageBase64: `data:image/png;base64,${imageBase64}`,
          cookie,
        })
      },
      fail: () => reject(new Error('验证码获取失败，请稍后重试')),
    })
  })

export const login = (payload: LoginPayload, captchaCookie?: string) =>
  request<LoginResult, LoginPayload>({
    url: '/api/answerly/v1/user/login',
    method: 'POST',
    data: payload,
    authRequired: false,
    headers: captchaCookie
      ? {
          Cookie: captchaCookie,
        }
      : {},
  })

export const getUserProfile = (username: string) =>
  request<UserProfile>({
    url: `/api/answerly/v1/user/${username}`,
    method: 'GET',
    authRequired: true,
  })

export const sendRegisterCode = (mail: string) =>
  request<boolean>({
    url: '/api/answerly/v1/user/send-code',
    method: 'GET',
    data: { mail },
    authRequired: false,
  })

export const register = (payload: RegisterPayload) =>
  request<null, RegisterPayload>({
    url: '/api/answerly/v1/user',
    method: 'POST',
    data: payload,
    authRequired: false,
  })
