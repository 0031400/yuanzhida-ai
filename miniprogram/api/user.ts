import type { LoginPayload, LoginResult, UserProfile } from '../types/user'
import { request } from '../utils/request'

export const login = (payload: LoginPayload) =>
  request<LoginResult, LoginPayload>({
    url: '/api/answerly/v1/user/login',
    method: 'POST',
    data: payload,
    authRequired: false,
  })

export const getUserProfile = (username: string) =>
  request<UserProfile>({
    url: `/api/answerly/v1/user/${username}`,
    method: 'GET',
    authRequired: true,
  })
